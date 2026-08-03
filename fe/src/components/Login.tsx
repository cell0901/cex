import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSigninMutation } from "../hooks/useAuth"
import { Eye, EyeOff } from "lucide-react"

export function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { mutate, isError } = useSigninMutation()

  return <div className="font-mono min-h-screen flex items-center justify-center bg-[#0a0a0a]">
    <div className="w-full max-w-lg px-4">
      <div className="relative p-[18px]">

        {/* Static dashed SVG border with fade */}
        {/* Card */}
        <div className="bg-[#111111] rounded-[1.2rem] px-10 py-10 shadow-2xl">

          {/* Logo + Brand */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <span className="text-white font-semibold text-xl tracking-wide">Login</span>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div >
              <input
                type="text"
                placeholder={"Username"}
                className="w-full px-4 py-2 text-sm text-[#e5e5e5] bg-[#1c1c1c] border border-[#2a2a2a] rounded-[0.7rem] placeholder-[#858585] transition duration-200 focus:outline-none focus:border-[#444] focus:ring-[3px] focus:ring-white/[0.04]"
                onChange={(e) => {
                  setUsername(e.target.value)
                }}
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={"Password"}
                className="w-full px-4 py-2 text-sm text-[#e5e5e5] bg-[#1c1c1c] border border-[#2a2a2a] rounded-[0.7rem] placeholder-[#858585] transition duration-200 focus:outline-none focus:border-[#444] focus:ring-[3px] focus:ring-white/[0.04]"
                onChange={(e) => {
                  setPassword(e.target.value)
                }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#858585] hover:text-[#e5e5e5] transition-colors duration-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {isError && <div className="flex justify-center pt-2">
            <p className="text-[13.5px] text-red-300 ">
              Incorrect username or password
            </p>
          </div>}


          {/* Button */}
          <button className="w-full mt-6 py-2.5 rounded-xl text-black font-semibold text-sm tracking-wide cursor-pointer bg-white border border-[#383838] transition duration-200 hover:from-[#3a3a3a] hover:to-[#252525] hover:border-[#484848] active:from-[#222] active:to-[#141414]"
            onClick={() => {
              mutate({ username, password }, {
                onSuccess: (data) => {
                  localStorage.setItem('token', data.token)
                  navigate('/trade/SOL_USDC')
                }
              })
            }}
          >
            Login
          </button>
          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#222]" />
            <span className="text-xs text-[#3a3a3a]">or</span>
            <div className="flex-1 h-px bg-[#222]" />
          </div>


          {/* Sign in link */}
          <p className="text-center text-[13.5px] text-[#4a4a4a]">
            New here?
            <a href="#" onClick={() => {
              navigate('/signup')
            }} className="text-[#2a75ee] hover:text-gray-500 transition-colors duration-200 font-sm ml-1">
              Signup
            </a>
          </p>


        </div>
      </div>
    </div>
  </div>

}
