import About from './pages/About';
import ApiAccess from './pages/ApiAccess';
import AttestationPortal from './pages/AttestationPortal';
import Contact from './pages/Contact';
import Home from './pages/Home';
import ManageDevices from './pages/ManageDevices';
import MyAccount from './pages/MyAccount';
import MyAttestations from './pages/MyAttestations';
import Pricing from './pages/Pricing';
import SavedCandidates from './pages/SavedCandidates';
import Scan from './pages/Scan';
import SharedReport from './pages/SharedReport';
import Team from './pages/Team';
import TeamDashboard from './pages/TeamDashboard';
import Tickets from './pages/Tickets';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "ApiAccess": ApiAccess,
    "AttestationPortal": AttestationPortal,
    "Contact": Contact,
    "Home": Home,
    "ManageDevices": ManageDevices,
    "MyAccount": MyAccount,
    "MyAttestations": MyAttestations,
    "Pricing": Pricing,
    "SavedCandidates": SavedCandidates,
    "Scan": Scan,
    "SharedReport": SharedReport,
    "Team": Team,
    "TeamDashboard": TeamDashboard,
    "Tickets": Tickets,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};