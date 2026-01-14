import About from './pages/About';
import ApiAccess from './pages/ApiAccess';
import ConsentDenied from './pages/ConsentDenied';
import ConsentSuccess from './pages/ConsentSuccess';
import Contact from './pages/Contact';
import EmployerResponseRecorded from './pages/EmployerResponseRecorded';
import EmployerVerified from './pages/EmployerVerified';
import Home from './pages/Home';
import ManageDevices from './pages/ManageDevices';
import MyAccount from './pages/MyAccount';
import NewVerification from './pages/NewVerification';
import Pricing from './pages/Pricing';
import SharedReport from './pages/SharedReport';
import Team from './pages/Team';
import TeamDashboard from './pages/TeamDashboard';
import Tickets from './pages/Tickets';
import VerificationDetail from './pages/VerificationDetail';
import VerificationsList from './pages/VerificationsList';
import SavedCandidates from './pages/SavedCandidates';
import Scan from './pages/Scan';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "ApiAccess": ApiAccess,
    "ConsentDenied": ConsentDenied,
    "ConsentSuccess": ConsentSuccess,
    "Contact": Contact,
    "EmployerResponseRecorded": EmployerResponseRecorded,
    "EmployerVerified": EmployerVerified,
    "Home": Home,
    "ManageDevices": ManageDevices,
    "MyAccount": MyAccount,
    "NewVerification": NewVerification,
    "Pricing": Pricing,
    "SharedReport": SharedReport,
    "Team": Team,
    "TeamDashboard": TeamDashboard,
    "Tickets": Tickets,
    "VerificationDetail": VerificationDetail,
    "VerificationsList": VerificationsList,
    "SavedCandidates": SavedCandidates,
    "Scan": Scan,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};