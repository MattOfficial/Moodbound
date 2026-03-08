import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Graph } from './pages/Graph';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/graph/:documentId" element={<Graph />} />
      </Routes>
    </Router>
  );
}

export default App;
