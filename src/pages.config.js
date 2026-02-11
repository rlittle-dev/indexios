/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ApiAccess from './pages/ApiAccess';
import AttestationPortal from './pages/AttestationPortal';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import Docs from './pages/Docs';
import EmailVerificationResponse from './pages/EmailVerificationResponse';
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
import AgentLane from './pages/AgentLane';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ApiAccess": ApiAccess,
    "AttestationPortal": AttestationPortal,
    "Blog": Blog,
    "Contact": Contact,
    "Docs": Docs,
    "EmailVerificationResponse": EmailVerificationResponse,
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
    "AgentLane": AgentLane,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};