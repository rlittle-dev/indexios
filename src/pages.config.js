import ApiAccess from './pages/ApiAccess';
import AttestationPortal from './pages/AttestationPortal';
import EmailVerificationResponse from './pages/EmailVerificationResponse';
import ManageDevices from './pages/ManageDevices';
import MyAttestations from './pages/MyAttestations';
import SavedCandidates from './pages/SavedCandidates';
import Scan from './pages/Scan';
import SharedReport from './pages/SharedReport';
import Team from './pages/Team';
import TeamDashboard from './pages/TeamDashboard';
import Tickets from './pages/Tickets';
import MyAccount from './pages/MyAccount';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ApiAccess": ApiAccess,
    "AttestationPortal": AttestationPortal,
    "EmailVerificationResponse": EmailVerificationResponse,
    "ManageDevices": ManageDevices,
    "MyAttestations": MyAttestations,
    "SavedCandidates": SavedCandidates,
    "Scan": Scan,
    "SharedReport": SharedReport,
    "Team": Team,
    "TeamDashboard": TeamDashboard,
    "Tickets": Tickets,
    "MyAccount": MyAccount,
    "Pricing": Pricing,
    "About": About,
    "Contact": Contact,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};