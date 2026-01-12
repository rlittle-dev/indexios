import ApiAccess from './pages/ApiAccess';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import SharedReport from './pages/SharedReport';
import Team from './pages/Team';
import About from './pages/About';
import Contact from './pages/Contact';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ApiAccess": ApiAccess,
    "Home": Home,
    "Pricing": Pricing,
    "SharedReport": SharedReport,
    "Team": Team,
    "About": About,
    "Contact": Contact,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};