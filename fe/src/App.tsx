import { BrowserRouter, Route, Routes } from "react-router-dom"
import { SignUp } from "./components/signup"
import { Login } from "./components/login"
import Trade from "./components/trade"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import LandingPage from "./components/Landing"

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
