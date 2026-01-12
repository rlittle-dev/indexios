import ApiAccess from './pages/ApiAccess';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Team from './pages/Team';
import SharedReport from './pages/SharedReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ApiAccess": ApiAccess,
    "Home": Home,
    "Pricing": Pricing,
    "Team": Team,
    "SharedReport": SharedReport,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};