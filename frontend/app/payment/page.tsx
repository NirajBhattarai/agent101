"use client";

import { PaymentForm } from "@/components/forms/payment/PaymentForm";
import { WalletConnect } from "@/components/shared";

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Hedera x402 Payment
            </h1>
            <p className="text-gray-600">
              Create, sign, verify, and settle payments using the x402 facilitator
            </p>
          </div>
          <WalletConnect />
        </div>

        {/* Payment Form */}
        <PaymentForm />
      </div>
    </div>
  );
}

