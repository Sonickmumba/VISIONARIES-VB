import { Link } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          VISIONARIES-VB
        </Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/groups" className="nav-link">
              Groups
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/cycles" className="nav-link">
              Cycles
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/loans" className="nav-link">
              Loans
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/savings" className="nav-link">
              Savings
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/login" className="nav-link">
              Login
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navbar
