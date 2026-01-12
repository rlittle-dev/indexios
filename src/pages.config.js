import About from './pages/About';
import ApiAccess from './pages/ApiAccess';
import Contact from './pages/Contact';
import Home from './pages/Home';
import ManageDevices from './pages/ManageDevices';
import MyAccount from './pages/MyAccount';
import Pricing from './pages/Pricing';
import SavedCandidates from './pages/SavedCandidates';
import SharedReport from './pages/SharedReport';
import Team from './pages/Team';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "ApiAccess": ApiAccess,
    "Contact": Contact,
    "Home": Home,
    "ManageDevices": ManageDevices,
    "MyAccount": MyAccount,
    "Pricing": Pricing,
    "SavedCandidates": SavedCandidates,
    "SharedReport": SharedReport,
    "Team": Team,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};