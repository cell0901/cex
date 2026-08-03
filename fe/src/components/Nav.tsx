import { useNavigate } from "react-router-dom"
import { useState } from "react";
import { Check, Play } from "lucide-react";
import { DepositScreen } from "./DepositScreen";

export const Navbar = () => {
  const navigate = useNavigate();

  return <div>
    Matchx
    <button className="border rounded-md p-0.5 " onClick={() => {
      navigate('/signup')
    }}>
      signup
    </button>
  </div>
}


export function DepositSuccessToast() {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-50">
      <div className="animate-[toast-in_300ms_ease-out] flex items-center gap-2  text-white text-[13.5px] font-mono px-4 py-2.5 ">
        <Check size={14} className="text-green-400 shrink-0" />
        Deposit successful
      </div>
      <style>{`
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>
    </div>
  );
}

export function TradeNavbar() {
  const navigate = useNavigate();
  const [depositCard, setDepositCard] = useState(false)
  const [showToast, setShowToast] = useState(false)

  return (
    <>
      {showToast && <DepositSuccessToast />}
      {depositCard ? (
        <DepositScreen onClose={() => {
          setDepositCard(false)
        }}
          onCloseSuccess={() => {
            setDepositCard(false)
            setShowToast(true)
            setTimeout(() => {
              setShowToast(false)
            }, 4000)

          }}
        />
      ) : (
        <header className="flex shrink-0 items-center justify-between  bg-[#17191A] px-6 py-3">
          <span className="font-mono text-xl tracking-wide text-[#dee35d]">MatchX</span>
          <div className="flex items-center">
            <button type="button"
              onClick={() => {
                setDepositCard(true)
              }}
              className="text-center font-semibold rounded-lg focus:ring-green-200 cursor-pointer focus:none focus:outline-none hover:opacity-90 disabled:opacity-80 disabled:hover:opacity-80 relative overflow-hidden h-[32px] text-sm px-3 py-1.5 mr-4 ">
              <div className="absolute inset-0 bg-green-500 opacity-[16%]"></div>
              <div className="flex flex-row font-mono items-center justify-center gap-4"><p className="text-green-500">Deposit</p></div>
            </button>
            <button type="button" className="text-center font-semibold 
          rounded-lg focus:ring-green-200 focus:none 
          focus:outline-none hover:opacity-90 disabled:opacity-80 disabled:hover:opacity-80 relative overflow-hidden h-[32px] cursor-pointer
          text-sm px-3 py-1.5 mr-4 bg-white "
              onClick={() => {
                localStorage.removeItem('token')
                navigate('/login')
              }}

            >
              <div className="flex flex-row items-center font-mono justify-center gap-2"><p className="text-zinc-900">Logout</p></div>
            </button>

          </div>
        </header>

      )}
    </>
  );
}
