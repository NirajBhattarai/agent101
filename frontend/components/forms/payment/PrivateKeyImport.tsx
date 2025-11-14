"use client";

import React, { useState, useEffect } from "react";
import { encryptPrivateKey } from "@/lib/shared/crypto/encryption";
import {
  storeEncryptedKey,
  getTimeRemaining,
  hasValidKey,
  getTimeRemaining as getKeyTimeRemaining,
} from "@/lib/shared/crypto/keyStorage";
import { AccountId, PrivateKey } from "@hashgraph/sdk";

interface PrivateKeyImportProps {
  onKeyImported: (accountId: string) => void;
  network: string;
}

export const PrivateKeyImport: React.FC<PrivateKeyImportProps> = ({ onKeyImported, network }) => {
  const [privateKey, setPrivateKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Check if key is already stored
  useEffect(() => {
    if (hasValidKey()) {
      const stored = getTimeRemaining();
      setTimeRemaining(stored);

      const interval = setInterval(() => {
        const remaining = getTimeRemaining();
        setTimeRemaining(remaining);
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  const handleImport = async () => {
    setError(null);
    setLoading(true);

    try {
      // Validate inputs
      if (!privateKey.trim()) {
        throw new Error("Private key is required");
      }

      if (!accountId.trim()) {
        throw new Error("Account ID is required");
      }

      // Validate account ID format (should be 0.0.xxxxx)
      if (!accountId.match(/^\d+\.\d+\.\d+$/)) {
        throw new Error("Invalid account ID format. Please use format: 0.0.123456");
      }

      if (!password) {
        throw new Error("Password is required");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      // Normalize private key (remove 0x prefix if present for Hedera)
      let normalizedKey = privateKey.trim();
      if (normalizedKey.startsWith("0x")) {
        normalizedKey = normalizedKey.slice(2);
      }

      // Validate private key by creating a Hedera PrivateKey object
      let hederaPrivateKey: PrivateKey;
      try {
        hederaPrivateKey = PrivateKey.fromStringECDSA(normalizedKey);
      } catch (err) {
        throw new Error("Invalid private key format. Please enter a valid ECDSA private key.");
      }

      // Validate account ID by creating an AccountId object
      try {
        AccountId.fromString(accountId.trim());
      } catch (err) {
        throw new Error(
          "Invalid account ID format. Please enter a valid Hedera account ID (0.0.xxxxx).",
        );
      }

      // Encrypt private key
      const encryptedKey = await encryptPrivateKey(normalizedKey, password);

      // Store encrypted key with account ID
      storeEncryptedKey(encryptedKey, accountId.trim());

      // Clear password fields
      setPassword("");
      setConfirmPassword("");
      setPrivateKey("");
      setAccountId("");

      // Notify parent
      onKeyImported(accountId.trim());

      console.log("✅ Private key imported and encrypted successfully");
    } catch (err: any) {
      setError(err.message || "Failed to import private key");
    } finally {
      setLoading(false);
    }
  };

  if (hasValidKey()) {
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">
              ✅ Private key loaded and encrypted
            </p>
            <p className="text-xs text-green-600 mt-1">
              Key will expire in {hours}h {minutes}m {seconds.toString().padStart(2, "0")}s
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-sm font-semibold text-yellow-800 mb-3">Import Hedera Private Key</h3>
      <p className="text-xs text-yellow-700 mb-4">
        Enter your private key and set a password. The key will be encrypted and stored securely for
        5 minutes.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Hedera Account ID</label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="0.0.123456"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Your Hedera account ID in format 0.0.xxxxx</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Private Key</label>
          <input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="Enter your Hedera private key (ECDSA format)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password (min 8 characters)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Importing..." : "Import & Encrypt Private Key"}
        </button>
      </div>
    </div>
  );
};
