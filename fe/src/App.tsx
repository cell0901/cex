import { BrowserRouter, Route, Routes } from "react-router-dom"
import { SignUp } from "./components/Signup"
import { Login } from "./components/Login"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import LandingPage from "./components/Landing"
import Trade from "./components/Trade"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/trade/:symbol" element={<Trade />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
