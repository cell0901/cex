import { useState } from "react"
import { X } from "lucide-react"
import { useDepositMutation } from "../hooks/useAuth"

export function DepositScreen({ onClose, onCloseSuccess }: { onClose: () => void, onCloseSuccess: () => void }) {
  const [amount, setAmount] = useState('')
  const { mutate } = useDepositMutation()

  return (
    <div className="fixed inset-0 font-mono z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 bg-[#0b0b0f] text-white rounded-2xl shadow-xl px-4 pt-5 pb-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h1 className="text-center text-lg font-semibold mb-6">Deposit</h1>

        {/* Amount input */}
        <p className="text-sm text-gray-400 mb-2">Amount</p>
        <div className="bg-[#1a1a20] rounded-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <input
              type="number"
              placeholder="Enter amount"
              onChange={(e) => { setAmount(e.target.value) }}
              className="bg-transparent outline-none [&::-webkit-inner-spin-button]:appearance-none text-gray-300 placeholder-gray-500 text-base w-full"
            />
            <button className="flex items-center gap-1 text-sm font-medium text-white shrink-0">
              USDC
            </button>
          </div>
          <p className="text-xs text-blue-400 mt-1">Available: {0} USDC</p>
        </div>

        {/* Continue button */}
        <button
          onClick={() => {
            mutate({ amount }, {
              onSuccess: () => {
                onCloseSuccess()
              }
            })
          }}
          className="w-full bg-white text-black font-medium rounded-full py-3.5 mt-6">
          Deposit
        </button>
      </div>
    </div>
  );
}
