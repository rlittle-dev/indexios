import Home from './pages/Home';
import Pricing from './pages/Pricing';
import ApiAccess from './pages/ApiAccess';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Pricing": Pricing,
    "ApiAccess": ApiAccess,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};