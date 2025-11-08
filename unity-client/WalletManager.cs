using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using Nethereum.Web3;
using Nethereum.Web3.Accounts;
using Nethereum.Contracts;
using Nethereum.Hex.HexTypes;
using Nethereum.RPC.Eth.DTOs;

/// <summary>
/// Manages blockchain wallet integration for Caribbean Crypto Game
/// Handles CARIB token transactions and NFT operations
/// </summary>
public class WalletManager : MonoBehaviour
{
    [Header("Blockchain Configuration")]
    [SerializeField] private string rpcUrl = "https://rpc-mumbai.maticvigil.com";
    [SerializeField] private string chainId = "80001"; // Mumbai testnet

    [Header("Contract Addresses")]
    [SerializeField] private string caribTokenAddress;
    [SerializeField] private string assetNFTAddress;

    // Web3 instance
    private Web3 web3;
    private Account playerAccount;

    // Contract ABIs (shortened for example - use full ABI in production)
    private const string CARIB_TOKEN_ABI = @"[
        {
            ""inputs"":[{""internalType"":""address"",""name"":""account"",""type"":""address""}],
            ""name"":""balanceOf"",
            ""outputs"":[{""internalType"":""uint256"",""name"":"""",""type"":""uint256""}],
            ""stateMutability"":""view"",
            ""type"":""function""
        }
    ]";

    private const string ASSET_NFT_ABI = @"[
        {
            ""inputs"":[{""internalType"":""address"",""name"":""owner"",""type"":""address""}],
            ""name"":""getAssetsByOwner"",
            ""outputs"":[{""internalType"":""uint256[]"",""name"":"""",""type"":""uint256[]""}],
            ""stateMutability"":""view"",
            ""type"":""function""
        }
    ]";

    // Events
    public event Action<decimal> OnBalanceUpdated;
    public event Action<List<NFTAsset>> OnAssetsLoaded;
    public event Action<string> OnTransactionSent;
    public event Action<string, string> OnError;

    // Current wallet state
    public bool IsConnected { get; private set; }
    public string WalletAddress { get; private set; }
    public decimal CaribBalance { get; private set; }
    public List<NFTAsset> OwnedAssets { get; private set; } = new List<NFTAsset>();

    private void Start()
    {
        // Initialize Web3 connection
        InitializeWeb3();
    }

    /// <summary>
    /// Initialize Web3 with RPC endpoint
    /// </summary>
    private void InitializeWeb3()
    {
        try
        {
            web3 = new Web3(rpcUrl);
            Debug.Log($"✅ Web3 initialized with RPC: {rpcUrl}");
        }
        catch (Exception ex)
        {
            Debug.LogError($"❌ Failed to initialize Web3: {ex.Message}");
            OnError?.Invoke("Web3 Initialization", ex.Message);
        }
    }

    /// <summary>
    /// Connect wallet using private key
    /// In production, use MetaMask or WalletConnect instead
    /// </summary>
    public async Task<bool> ConnectWallet(string privateKey)
    {
        try
        {
            playerAccount = new Account(privateKey);
            web3 = new Web3(playerAccount, rpcUrl);

            WalletAddress = playerAccount.Address;
            IsConnected = true;

            Debug.Log($"✅ Wallet connected: {WalletAddress}");

            // Load initial data
            await RefreshWalletData();

            return true;
        }
        catch (Exception ex)
        {
            Debug.LogError($"❌ Wallet connection failed: {ex.Message}");
            OnError?.Invoke("Wallet Connection", ex.Message);
            return false;
        }
    }

    /// <summary>
    /// Refresh wallet balance and owned assets
    /// </summary>
    public async Task RefreshWalletData()
    {
        if (!IsConnected)
        {
            Debug.LogWarning("⚠️ Wallet not connected");
            return;
        }

        await Task.WhenAll(
            GetCaribBalance(),
            GetOwnedAssets()
        );
    }

    /// <summary>
    /// Get CARIB token balance
    /// </summary>
    public async Task<decimal> GetCaribBalance()
    {
        try
        {
            var contract = web3.Eth.GetContract(CARIB_TOKEN_ABI, caribTokenAddress);
            var balanceFunction = contract.GetFunction("balanceOf");

            var balance = await balanceFunction.CallAsync<BigInteger>(WalletAddress);
            CaribBalance = Web3.Convert.FromWei(balance);

            Debug.Log($"💰 CARIB Balance: {CaribBalance}");
            OnBalanceUpdated?.Invoke(CaribBalance);

            return CaribBalance;
        }
        catch (Exception ex)
        {
            Debug.LogError($"❌ Failed to get balance: {ex.Message}");
            OnError?.Invoke("Get Balance", ex.Message);
            return 0;
        }
    }

    /// <summary>
    /// Get all NFT assets owned by player
    /// </summary>
    public async Task<List<NFTAsset>> GetOwnedAssets()
    {
        try
        {
            var contract = web3.Eth.GetContract(ASSET_NFT_ABI, assetNFTAddress);
            var getAssetsFunction = contract.GetFunction("getAssetsByOwner");

            var tokenIds = await getAssetsFunction.CallAsync<List<BigInteger>>(WalletAddress);

            OwnedAssets.Clear();
            foreach (var tokenId in tokenIds)
            {
                // Fetch asset details (implement getAsset function call)
                var asset = new NFTAsset
                {
                    TokenId = (int)tokenId,
                    Name = $"Asset #{tokenId}",
                    AssetType = AssetType.Vehicle,
                    Island = "Jamaica"
                };
                OwnedAssets.Add(asset);
            }

            Debug.Log($"🏆 Owned Assets: {OwnedAssets.Count}");
            OnAssetsLoaded?.Invoke(OwnedAssets);

            return OwnedAssets;
        }
        catch (Exception ex)
        {
            Debug.LogError($"❌ Failed to get assets: {ex.Message}");
            OnError?.Invoke("Get Assets", ex.Message);
            return new List<NFTAsset>();
        }
    }

    /// <summary>
    /// Transfer CARIB tokens
    /// </summary>
    public async Task<string> TransferCarib(string toAddress, decimal amount)
    {
        try
        {
            if (!IsConnected)
            {
                throw new Exception("Wallet not connected");
            }

            var contract = web3.Eth.GetContract(CARIB_TOKEN_ABI, caribTokenAddress);
            var transferFunction = contract.GetFunction("transfer");

            var amountWei = Web3.Convert.ToWei(amount);
            var transactionHash = await transferFunction.SendTransactionAsync(
                playerAccount.Address,
                new HexBigInteger(300000), // Gas limit
                null, // Gas price (auto)
                new HexBigInteger(0), // Value
                toAddress,
                amountWei
            );

            Debug.Log($"✅ Transfer sent: {transactionHash}");
            OnTransactionSent?.Invoke(transactionHash);

            // Wait for confirmation
            await WaitForTransactionReceipt(transactionHash);

            // Refresh balance
            await GetCaribBalance();

            return transactionHash;
        }
        catch (Exception ex)
        {
            Debug.LogError($"❌ Transfer failed: {ex.Message}");
            OnError?.Invoke("Transfer", ex.Message);
            return null;
        }
    }

    /// <summary>
    /// Wait for transaction to be mined
    /// </summary>
    private async Task<TransactionReceipt> WaitForTransactionReceipt(string transactionHash)
    {
        Debug.Log($"⏳ Waiting for transaction: {transactionHash}");

        var receipt = await web3.Eth.Transactions.GetTransactionReceipt.SendRequestAsync(transactionHash);

        while (receipt == null)
        {
            await Task.Delay(2000); // Wait 2 seconds
            receipt = await web3.Eth.Transactions.GetTransactionReceipt.SendRequestAsync(transactionHash);
        }

        Debug.Log($"✅ Transaction confirmed in block: {receipt.BlockNumber}");
        return receipt;
    }

    /// <summary>
    /// Disconnect wallet
    /// </summary>
    public void DisconnectWallet()
    {
        IsConnected = false;
        WalletAddress = null;
        playerAccount = null;
        CaribBalance = 0;
        OwnedAssets.Clear();

        Debug.Log("👋 Wallet disconnected");
    }
}

/// <summary>
/// NFT Asset data structure
/// </summary>
[Serializable]
public class NFTAsset
{
    public int TokenId;
    public string Name;
    public AssetType AssetType;
    public string Island;
    public int Value;
    public bool IsLocked;
}

/// <summary>
/// Asset types matching smart contract
/// </summary>
public enum AssetType
{
    Vehicle = 0,
    Property = 1,
    Weapon = 2,
    Business = 3,
    Item = 4
}
