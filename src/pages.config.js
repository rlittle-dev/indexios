import Home from './pages/Home';
import Pricing from './pages/Pricing';
import ApiAccess from './pages/ApiAccess';
import Team from './pages/Team';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Pricing": Pricing,
    "ApiAccess": ApiAccess,
    "Team": Team,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};