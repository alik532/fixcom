import './App.css';
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom'
import Leads from './components/Leads';

function App() {
  

  return (
    <div className="App"> 
     <BrowserRouter>
      <Routes>
        <Route path="/api/leads" element={<Leads />}/>
        <Route path="/" element={<Link to={'/api/leads'}>Перейти в /api/leads</Link>}/>
      </Routes>
    </BrowserRouter>
    </div>
  );
}

export default App;
