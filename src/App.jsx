import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import FeatureSection from './components/FeatureSection'
import{Routes, Route} from "react-router-dom";
import Products from "./pages/Products";


function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<><HeroSection /><FeatureSection /></>}/>
        <Route path="/products" element={<Products />}/>
      </Routes>
    </>
  )
}

export default App