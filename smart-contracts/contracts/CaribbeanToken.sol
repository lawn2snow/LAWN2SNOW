// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CaribbeanToken
 * @dev The main game currency (CARIB)
 * Players can earn this through missions and trade it on exchanges
 */
contract CaribbeanToken is ERC20, Ownable, Pausable {

    // Game contract that can mint rewards
    address public gameContract;

    // Anti-fraud: blacklist suspicious addresses
    mapping(address => bool) public isBlacklisted;

    // Track total rewards distributed
    uint256 public totalRewardsDistributed;

    // Maximum supply cap (100 million tokens)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;

    // Events
    event GameContractUpdated(address indexed newGameContract);
    event PlayerRewarded(address indexed player, uint256 amount, string reason);
    event AddressBlacklisted(address indexed account, bool status);
    event TokensBurned(address indexed from, uint256 amount);

    constructor() ERC20("Caribbean Crypto", "CARIB") {
        // Mint initial supply to deployer (for initial sales/liquidity)
        _mint(msg.sender, 10_000_000 * 10**18); // 10% of max supply
    }

    /**
     * @dev Set the game contract address (only callable by owner)
     */
    function setGameContract(address _gameContract) external onlyOwner {
        require(_gameContract != address(0), "Invalid game contract");
        gameContract = _gameContract;
        emit GameContractUpdated(_gameContract);
    }

    /**
     * @dev Reward player (called by game contract)
     */
    function rewardPlayer(address player, uint256 amount, string memory reason)
        external
        whenNotPaused
    {
        require(msg.sender == gameContract, "Only game contract can reward");
        require(player != address(0), "Invalid player address");
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");

        _mint(player, amount);
        totalRewardsDistributed += amount;

        emit PlayerRewarded(player, amount, reason);
    }

    /**
     * @dev Burn tokens (deflationary mechanism)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Blacklist/whitelist addresses (anti-fraud)
     */
    function setBlacklist(address account, bool status) external onlyOwner {
        isBlacklisted[account] = status;
        emit AddressBlacklisted(account, status);
    }

    /**
     * @dev Pause transfers in emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override transfer to add blacklist check
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        require(!isBlacklisted[from], "Sender is blacklisted");
        require(!isBlacklisted[to], "Recipient is blacklisted");
        super._beforeTokenTransfer(from, to, amount);
    }
}
