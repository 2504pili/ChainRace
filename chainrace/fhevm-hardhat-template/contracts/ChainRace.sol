// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, ebool, externalEuint32, externalEuint64, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ChainRace (FHEVM)
 * @notice 赛季化链上赛车计时。bestTime/attempts 为同态加密存储，通过 ACL 控制解密权限。
 * @dev    采用 euint32 存储毫秒级成绩（最大 ~49天），attempts 使用 euint32；排行榜通过事件与前端聚合。
 */
contract ChainRace is SepoliaConfig {
    address private _owner;
    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    }
    struct RaceRecord {
        euint32 bestTime;   // 加密的最佳毫秒
        euint32 attempts;   // 加密的尝试次数
        ebool  hasAny;      // 是否提交过（加密布尔）
    }

    uint256 public currentSeason;

    // season => user => record
    mapping(uint256 => mapping(address => RaceRecord)) private _records;
    // season => participants list（明文地址，仅用于遍历；不含敏感信息）
    mapping(uint256 => address[]) private _participants;
    mapping(uint256 => mapping(address => bool)) private _isParticipant;
    // season => user => has submitted flag (明文标志，用于检查是否首次提交)
    mapping(uint256 => mapping(address => bool)) private _hasSubmitted;

    event RaceSubmitted(address indexed racer, uint256 timeMs, uint256 season);
    event NewSeason(uint256 indexed newSeasonId);

    constructor() {
        _owner = msg.sender;
        currentSeason = 1;
        emit NewSeason(currentSeason);
    }

    /**
     * @notice 提交本次成绩（毫秒），外部密文 + 证明。
     * @param timeMsE external 密文（建议 euint32）
     * @param inputProof 密文证明
     *
     * 逻辑：
     * - attempts += 1
     * - 若首次提交，初始化 bestTime = timeMs
     * - 否则若 timeMs < bestTime，则更新最佳
     * - 为调用者授予解密权限（ACL），并为合约自身授权
     */
    // 为了排行榜公开透明，额外接收明文 timeMsPlain 写入公开视图；
    // 同时 bestTime/attempts 以加密形式存储以演示 FHE 的用法。
    function submitRaceTime(
        externalEuint32 timeMsE,
        bytes calldata inputProof,
        uint32 timeMsPlain
    ) external {
        euint32 timeMs = FHE.fromExternal(timeMsE, inputProof);

        RaceRecord storage r = _records[currentSeason][msg.sender];

        // 检查是否是首次提交
        bool isFirstTime = !_hasSubmitted[currentSeason][msg.sender];
        
        if (isFirstTime) {
            // 首次提交：直接设置初始值
            r.bestTime = timeMs;
            r.attempts = FHE.asEuint32(1);
            r.hasAny = FHE.asEbool(true);
            _hasSubmitted[currentSeason][msg.sender] = true;
        } else {
            // 非首次：增加尝试次数并检查是否更好
            r.attempts = FHE.add(r.attempts, FHE.asEuint32(1));
            
            // 如果新时间更好，则更新最佳时间
            ebool isBetter = FHE.lt(timeMs, r.bestTime);
            r.bestTime = FHE.select(isBetter, timeMs, r.bestTime);
        }

        // ACL：允许合约继续处理，允许提交者解密自己的字段
        FHE.allowThis(r.bestTime);
        FHE.allowThis(r.attempts);
        FHE.allowThis(r.hasAny);
        FHE.allow(r.bestTime, msg.sender);
        FHE.allow(r.attempts, msg.sender);
        FHE.allow(r.hasAny, msg.sender);

        // 记录参与者列表（明文）
        if (!_isParticipant[currentSeason][msg.sender]) {
            _isParticipant[currentSeason][msg.sender] = true;
            _participants[currentSeason].push(msg.sender);
        }

        // 公开排行榜（明文）
        _updatePublic(currentSeason, msg.sender, timeMsPlain);

        emit RaceSubmitted(msg.sender, timeMsPlain, currentSeason);
    }

    /**
     * @notice 读取自己记录（加密字段），用于前端解密（userDecrypt）。
     */
    function getMyRecord(uint256 season)
        external
        view
        returns (euint32 bestTime, euint32 attempts, ebool hasAny)
    {
        RaceRecord storage r = _records[season][msg.sender];
        return (r.bestTime, r.attempts, r.hasAny);
    }

    /**
     * @notice 读取指定用户的加密记录（便于只读排行榜/好友查看）。
     */
    function getRecordOf(uint256 season, address user)
        external
        view
        returns (euint32 bestTime, euint32 attempts, ebool hasAny)
    {
        RaceRecord storage r = _records[season][user];
        return (r.bestTime, r.attempts, r.hasAny);
    }

    /**
     * @notice 参与者分页视图（仅地址，不含隐私）。
     */
    function getParticipants(uint256 season, uint256 start, uint256 count)
        external
        view
        returns (address[] memory)
    {
        address[] storage list = _participants[season];
        uint256 n = list.length;
        if (start >= n) return new address[](0);
        uint256 end = start + count;
        if (end > n) end = n;
        address[] memory out = new address[](end - start);
        for (uint256 i = start; i < end; i++) out[i - start] = list[i];
        return out;
    }

    function getParticipantsLength(uint256 season) external view returns (uint256) {
        return _participants[season].length;
    }

    /**
     * @notice 开启新赛季。
     */
    function startNewSeason() external onlyOwner {
        currentSeason += 1;
        emit NewSeason(currentSeason);
    }

    // ----------------------------------------------------------------------
    // 公开视图：用于排行榜（非隐私），与加密状态并存
    // ----------------------------------------------------------------------
    mapping(uint256 => mapping(address => uint32)) private _bestTimePublic;
    mapping(uint256 => mapping(address => uint32)) private _attemptsPublic;
    function _updatePublic(uint256 season, address user, uint32 timeMsPlain) internal {
        unchecked {
            _attemptsPublic[season][user] += 1;
            uint32 curr = _bestTimePublic[season][user];
            if (curr == 0 || timeMsPlain < curr) {
                _bestTimePublic[season][user] = timeMsPlain;
            }
            if (!_isParticipant[season][user]) {
                _isParticipant[season][user] = true;
                _participants[season].push(user);
            }
        }
    }
    function getBestTimePublic(uint256 season, address user) external view returns (uint32) {
        return _bestTimePublic[season][user];
    }
    function getAttemptsPublic(uint256 season, address user) external view returns (uint32) {
        return _attemptsPublic[season][user];
    }
}


