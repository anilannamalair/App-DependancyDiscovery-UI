import { useState } from 'react'
import './App.css'

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import ImportPage from './components/ImportPage';


function App() {
  const [count, setCount] = useState(0)

 
  return (
    <Router>
      <Routes>
      {/* <Route path="/" element={<HomePage />} /> */}
      <Route path="/" element={<ImportPage />} />
      </Routes>
    </Router>
  )
}

export default App
