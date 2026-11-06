import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Home from '../pages/public/Home';
import AboutAndContact from '../pages/public/AboutAndContact';
import About from '../pages/public/About';
import Contact from '../pages/public/Contact';
import Checkout from '../pages/public/Checkout';
import FeaturedListingControl from '../pages/public/FeaturedListingControl';
import FiltersAndSort from '../pages/public/FiltersAndSort';
import InquiryForm from '../pages/public/InquiryForm';
import InquirySuccess from '../pages/public/InquirySuccess';
import LoginRequired from '../pages/public/LoginRequired';
import PaymentFailed from '../pages/public/PaymentFailed';
import PaymentSucess from '../pages/public/PaymentSucess';
import PostPaymentRedirect from '../pages/public/PostPaymentRedirect';
import Redirecting from '../pages/public/Redirecting';
import Listings from '../pages/public/Listings';
import PropertyDetails from '../pages/public/PropertyDetails';
import PropertyPriceHistory from '../pages/public/PropertyPriceHistory';
import Projects from '../pages/public/Projects';
import ProjectDetails from '../pages/public/ProjectDetails';
import ProjectProperties from '../pages/public/ProjectProperties';
import ProjectsMap from '../pages/public/ProjectsMap';
import TitleVerificationRegistry from '../pages/public/TitleVerificationRegistry';
import TitleRegistrySnapshots from '../pages/public/TitleRegistrySnapshots';
import ProtectedTitleViewer from '../pages/public/ProtectedTitleViewer';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyEmail from '../pages/auth/VerifyEmail';
import RegistrationSuccess from '../pages/auth/RegistrationSuccess';
import AuthError from '../pages/auth/AuthError';
import LoginToPurchase from '../pages/auth/LoginToPurchase';
import RegisterToPurchase from '../pages/auth/RegisterToPurchase';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import AdminLogin from '../pages/auth/Admin/AdminLogin';
import LandlordLogin from '../pages/auth/Landlord/LandlordLogin';
import LandlordRegistration from '../pages/auth/Landlord/LandlordRegistration';
import AccountSecuritySettingsPage from '../pages/proxyNetwork/AccountSecuritySettingsPage';

import Dashboard from '../pages/dashboard/Dashboard';
import Tours from '../pages/dashboard/Tours';
import Installments from '../pages/dashboard/Installments';
import NotificationDigest from '../pages/dashboard/NotificationDigest';
import AdminDashboard from '../pages/dashboard/Admin/AdminDashboard';
import AdminCartCheckoutDetail from '../pages/dashboard/Admin/CartCheckoutDetail';
import AdminCartCheckouts from '../pages/dashboard/Admin/CartCheckouts';
import AdminPropertyDetails from '../pages/dashboard/Admin/AdminPropertyDetails';
import AdminInquiryDetails from '../pages/dashboard/Admin/AdminInquiryDetails';
import LandlordDetails from '../pages/dashboard/Admin/LandlordDetails';
import UserDetails from '../pages/dashboard/Admin/UserDetails';
import ManageInquiries from '../pages/dashboard/Admin/ManageInquiries';
import ManageLandlords from '../pages/dashboard/Admin/ManageLandlords';
import ManagePayments from '../pages/dashboard/Admin/ManagePayments';
import LegalHolds from '../pages/dashboard/Admin/LegalHolds';
import StaffAccessChanges from '../pages/dashboard/Admin/StaffAccessChanges';
import NotificationDeliveryReconciliation from '../pages/dashboard/Admin/NotificationDeliveryReconciliation';
import OrganizationManagement from '../pages/dashboard/OrganizationManagement';
import ManageProperties from '../pages/dashboard/Admin/ManageProperties';
import AdminProjects from '../pages/dashboard/Admin/Projects';
import AdminProjectDetails from '../pages/dashboard/Admin/ProjectDetails';
import AdminPropertyImports from '../pages/dashboard/Admin/PropertyImports';
import ManageUsers from '../pages/dashboard/Admin/ManageUsers';
import FeaturedListings from '../pages/dashboard/Admin/FeaturedListings';
import AdminPaymentDetails from '../pages/dashboard/Admin/AdminPaymentDetails';
import TitleVerificationReview from '../pages/dashboard/Admin/TitleVerificationReview';
import PropertyApprovalReview from '../pages/dashboard/Admin/PropertyApprovalReview';
import BuyerDashboard from '../pages/dashboard/Buyer/BuyerDashboard';
import CartCheckoutDetail from '../pages/dashboard/Buyer/CartCheckoutDetail';
import CartCheckouts from '../pages/dashboard/Buyer/CartCheckouts';
import InquiryDetails from '../pages/dashboard/Buyer/InquiryDetails';
import InquiryHistory from '../pages/dashboard/Buyer/InquiryHistory';
import MyProperties from '../pages/dashboard/Buyer/MyProperties';
import PaymentDetails from '../pages/dashboard/Buyer/PaymentDetails';
import PaymentHistory from '../pages/dashboard/Buyer/PaymentHistory';
import ProfileSettings from '../pages/dashboard/Buyer/ProfileSettings';
import ServiceCart from '../pages/dashboard/Buyer/ServiceCart';
import BuyerPropertyDetails from '../pages/dashboard/Buyer/PropertyDetails';
import AddProperty from '../pages/dashboard/Landlord/AddProperty';
import Editproperty from '../pages/dashboard/Landlord/Editproperty';
import InquiriesList from '../pages/dashboard/Landlord/InquiriesList';
import LandlordDashboard from '../pages/dashboard/Landlord/LandlordDashboard';
import LandlordInquiryDetails from '../pages/dashboard/Landlord/LandlordInquiryDetails';
import LandlordMyProperties from '../pages/dashboard/Landlord/LandlordMyProperties';
import LandlordProjects from '../pages/dashboard/Landlord/Projects';
import ProjectEditor from '../pages/dashboard/Landlord/ProjectEditor';
import ProjectManage from '../pages/dashboard/Landlord/ProjectManage';
import ProjectPropertyImports from '../pages/dashboard/Landlord/ProjectPropertyImports';
import LandlordPaymentHistory from '../pages/dashboard/Landlord/LandlordPaymentHistory';
import LandlordPropertyDetails from '../pages/dashboard/Landlord/LandlordPropertyDetails';
import LandlordSettings from '../pages/dashboard/Landlord/LandlordSettings';
import LandlordVerification from '../pages/dashboard/Landlord/LandlordVerification';
import LandlordTitleVerifications from '../pages/dashboard/Landlord/LandlordTitleVerifications';
import ProtectedRoute from './ProtectedRoute';
import { AdminAccessBoundary, AdminAccessRoute, AdminCapabilityRoute } from './AdminAccessRoute';
import { useAuth } from '../contexts/AuthContext';
import ROICalculatorPage from '../pages/dashboard/ROI/ROICalculatorPage';
import MyROIScenarios from '../pages/dashboard/ROI/MyROIScenarios';
import ROIAssumptions from '../pages/dashboard/Admin/ROIAssumptions';
import AdminSettings from '../pages/dashboard/Admin/AdminSettings';
import AdminPolicies from '../pages/dashboard/Admin/AdminPolicies';
import AdminVirtualTours from '../pages/dashboard/Admin/AdminVirtualTours';
import AdminVirtualTourDetail from '../pages/dashboard/Admin/AdminVirtualTourDetail';
import AdminWallet from '../pages/dashboard/Admin/AdminWallet';
import AdminEscrowDisputes from '../pages/dashboard/Admin/AdminEscrowDisputes';
import AdminEscrowDisputeDetails from '../pages/dashboard/Admin/AdminEscrowDisputeDetails';
import KycManagement from '../pages/dashboard/Admin/KycManagement';
import AdminDataProtectionExecution from '../pages/dashboard/Admin/AdminDataProtectionExecution';
import EscrowList from '../pages/dashboard/Escrow/EscrowList';
import EscrowDetails from '../pages/dashboard/Escrow/EscrowDetails';
import CreateEscrow from '../pages/dashboard/Escrow/CreateEscrow';
import PublicInspectorDirectory from '../pages/proxyNetwork/PublicInspectorDirectory';
import PublicInspectorProfile from '../pages/proxyNetwork/PublicInspectorProfile';
import InspectorRegistration from '../pages/proxyNetwork/InspectorRegistration';
import InspectorOnboarding from '../pages/proxyNetwork/InspectorOnboarding';
import PayoutAccountSettings from '../pages/proxyNetwork/PayoutAccountSettings';
import CreateProxyInspection from '../pages/proxyNetwork/CreateProxyInspection';
import { BuyerProxyInspections, InspectorTasks, AdminProxyInspections } from '../pages/proxyNetwork/ProxyJobLists';
import { BuyerProxyWorkspace, InspectorProxyWorkspace, AdminProxyWorkspace } from '../pages/proxyNetwork/ProxyWorkspaces';
import ProxyPaymentReturn from '../pages/proxyNetwork/ProxyPaymentReturn';
import { AdminInspectorDetailPage, AdminInspectorList } from '../pages/proxyNetwork/AdminInspectors';
import Messages from '../pages/dashboard/Messages';
import Personalisation from '../pages/dashboard/Personalisation';
import Notifications from '../pages/dashboard/Notifications';
import ValuationPage from '../pages/dashboard/ValuationPage';
import TrustAccount from '../pages/dashboard/TrustAccount';
import TrustAppeals from '../pages/dashboard/Admin/TrustAppeals';
import MessageModeration from '../pages/dashboard/Admin/MessageModeration';
import NotFound from '../pages/public/NotFound';
const AuditReader = lazy(() => import('../pages/secure/AuditReader'));

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
};

const adminPage = (capability: string | readonly string[], page: ReactNode, allowReadOnly = false) =>
  <AdminCapabilityRoute capability={capability} allowReadOnly={allowReadOnly}>{page}</AdminCapabilityRoute>;

const DeveloperProfileRoute = () => {
  const { activeProfile } = useAuth();
  return activeProfile?.kind === 'developer' ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Listings />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/map" element={<ProjectsMap />} />
        <Route path="/projects/:slug" element={<ProjectDetails />} />
        <Route path="/projects/:slug/properties" element={<ProjectProperties />} />
        <Route path="/proxy-inspectors" element={<PublicInspectorDirectory />} />
        <Route path="/proxy-inspectors/register" element={<InspectorRegistration />} />
        <Route path="/proxy-inspectors/:profileId" element={<PublicInspectorProfile />} />

        <Route path="/about-contact" element={<AboutAndContact />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/cart" element={<ServiceCart />} />
        <Route path="/featured-control" element={<FeaturedListingControl />} />
        <Route path="/filters" element={<FiltersAndSort />} />
        <Route path="/inquiry" element={<InquiryForm />} />
        <Route path="/inquiry-success" element={<InquirySuccess />} />
        <Route path="/login-required" element={<LoginRequired />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
        <Route path="/payment-success" element={<PaymentSucess />} />
        <Route path="/post-payment-redirect" element={<PostPaymentRedirect />} />
        <Route path="/payments/verify" element={<ProxyPaymentReturn />} />
        <Route path="/redirecting" element={<Redirecting />} />

        <Route path="/tools/roi-calculator" element={<ROICalculatorPage />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/auth/verify-email" element={<VerifyEmail />} />
        <Route path="/registration-success" element={<RegistrationSuccess />} />
        <Route path="/auth-error" element={<AuthError />} />
        <Route path="/login-to-purchase" element={<LoginToPurchase />} />
        <Route path="/register-to-purchase" element={<RegisterToPurchase />} />
        <Route path="/real/admin" element={<AdminLogin />} />
        <Route path="/auth/owner/login" element={<LandlordLogin />} />
        <Route path="/auth/owner/register" element={<LandlordRegistration />} />
        <Route path='/auth/landlord/login' element={<Navigate to='/auth/owner/login' replace />} />
        <Route path='/auth/landlord/register' element={<Navigate to='/auth/owner/register' replace />} />

        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/properties/:id/price-history" element={<PropertyPriceHistory />} />
        <Route path="/title-verification/:publicVerificationId" element={<TitleVerificationRegistry />} />
        <Route path="/title-registry/snapshots" element={<TitleRegistrySnapshots />} />
        <Route path="/protected-title-viewer" element={<ProtectedTitleViewer />} />
        <Route path="/properties/:propertyId/roi" element={<Navigate to="/properties" replace />} />
        <Route path="/analytics/property-market" element={<Navigate to="/properties" replace />} />
        <Route path="/analytics/property-market/access" element={<Navigate to="/properties" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/verification" element={<LandlordVerification />} />
          <Route path='/messages' element={<Messages />} />
          <Route path='/messages/:conversationId' element={<Messages />} />
          <Route path='/dashboard/personalisation' element={<Personalisation />} />
          <Route path='/dashboard/notifications' element={<Notifications />} />
          <Route path='/dashboard/trust' element={<TrustAccount />} />
          <Route path='/dashboard/organization' element={<OrganizationManagement />} />
          <Route path='/dashboard/valuations/:propertyReference' element={<ValuationPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/roi-v1/properties/:propertyReference/new" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/roi-v1/estimates/:estimateReference" element={<Navigate to="/dashboard" replace />} />
          <Route path="/analytics/property-market/payment-return" element={<ProxyPaymentReturn />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['owner', 'admin']} />}>
          <Route path="/dashboard/roi-v1/properties/:propertyReference/history" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
          <Route path="/buyer/proxy-inspections" element={<BuyerProxyInspections />} />
          <Route path="/buyer/proxy-inspections/new" element={<CreateProxyInspection />} />
          <Route path="/buyer/proxy-inspections/:requestId" element={<BuyerProxyWorkspace />} />
          <Route path="/dashboard/buyer" element={<BuyerDashboard />} />
          <Route path="/dashboard/buyer/my-properties" element={<MyProperties />} />
          <Route path="/dashboard/buyer/tours" element={<Tours />} />
          <Route path="/dashboard/buyer/installments" element={<Installments />} />
          <Route path="/dashboard/buyer/installments/:id" element={<Installments />} />
          <Route path="/dashboard/buyer/property-details" element={<BuyerPropertyDetails />} />
          <Route path="/dashboard/buyer/property-details/:id" element={<BuyerPropertyDetails />} />
          <Route path="/dashboard/buyer/payment-history" element={<PaymentHistory />} />
          <Route path="/dashboard/buyer/payment-details/:id" element={<PaymentDetails />} />
          <Route path="/dashboard/buyer/payment-details" element={<PaymentDetails />} />
          <Route path="/dashboard/buyer/cart" element={<ServiceCart />} />
          <Route path="/dashboard/buyer/cart-checkouts" element={<CartCheckouts />} />
          <Route path="/dashboard/buyer/cart-checkouts/:checkoutId" element={<CartCheckoutDetail />} />
          <Route path="/dashboard/buyer/inquiry-history" element={<InquiryHistory />} />
          <Route path="/dashboard/buyer/inquiry-details" element={<InquiryDetails />} />
          <Route path="/dashboard/buyer/inquiry-details/:id" element={<InquiryDetails />} />
          <Route path="/dashboard/buyer/profile-settings" element={<ProfileSettings />} />
          <Route path="/dashboard/buyer/escrows" element={<EscrowList />} />
          <Route path="/dashboard/buyer/escrows/create/:propertyId" element={<CreateEscrow />} />
          <Route path="/dashboard/buyer/escrows/:id" element={<EscrowDetails />} />
          <Route path="/dashboard/roi-scenarios" element={<MyROIScenarios />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['proxy_inspector']} />}>
          <Route path="/proxy-inspector/onboarding" element={<InspectorOnboarding />} />
          <Route path="/proxy-inspector/payout-account" element={<PayoutAccountSettings />} />
          <Route path="/account/security" element={<AccountSecuritySettingsPage />} />
          <Route path="/proxy/tasks" element={<InspectorTasks />} />
          <Route path="/proxy/tasks/:requestId" element={<InspectorProxyWorkspace />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['owner']} />}>
          <Route path="/dashboard/landlord" element={<LandlordDashboard />} />
          <Route path="/dashboard/landlord/my-properties" element={<LandlordMyProperties />} />
          <Route element={<DeveloperProfileRoute />}>
            <Route path="/dashboard/landlord/projects" element={<LandlordProjects />} />
            <Route path="/dashboard/landlord/projects/new" element={<ProjectEditor />} />
            <Route path="/dashboard/landlord/projects/:id" element={<ProjectManage />} />
            <Route path="/dashboard/landlord/projects/:id/edit" element={<ProjectEditor />} />
            <Route path="/dashboard/landlord/projects/:id/imports" element={<ProjectPropertyImports />} />
            <Route path="/dashboard/landlord/projects/:id/imports/:importId" element={<ProjectPropertyImports />} />
          </Route>
          <Route path="/dashboard/landlord/tours" element={<Tours />} />
          <Route path="/dashboard/landlord/installments" element={<Installments />} />
          <Route path="/dashboard/landlord/installments/:id" element={<Installments />} />
          <Route path="/dashboard/landlord/property-details" element={<LandlordPropertyDetails />} />
          <Route path="/dashboard/landlord/property-details/:id" element={<LandlordPropertyDetails />} />
          <Route path="/dashboard/landlord/payment-history" element={<LandlordPaymentHistory />} />
          <Route path="/dashboard/landlord/inquiries" element={<InquiriesList />} />
          <Route path="/dashboard/landlord/inquiry-details" element={<LandlordInquiryDetails />} />
          <Route path="/dashboard/landlord/inquiry-details/:id" element={<LandlordInquiryDetails />} />
          <Route path="/dashboard/landlord/add-property" element={<AddProperty />} />
          <Route path="/properties/create" element={<AddProperty />} />
          <Route path="/dashboard/landlord/edit-property" element={<Editproperty />} />
          <Route path="/dashboard/landlord/edit-property/:id" element={<Editproperty />} />
          <Route path="/dashboard/landlord/settings" element={<LandlordSettings />} />
          <Route path="/dashboard/landlord/escrows" element={<EscrowList />} />
          <Route path="/dashboard/landlord/escrows/:id" element={<EscrowDetails />} />
          <Route path="/dashboard/landlord/settings/verification" element={<LandlordVerification />} />
          <Route path="/dashboard/landlord/title-verifications" element={<LandlordTitleVerifications />} />
          <Route path="/settings/verification" element={<LandlordVerification />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<AdminAccessRoute />}>
            <Route path="/asdfghjkl;mnbvcxz" element={adminPage('audit.read', <Suspense fallback={<div className="p-12 text-center" role="status">Opening audit reader…</div>}><AuditReader /></Suspense>, true)} />
            <Route path='/dashboard/admin/trust-appeals' element={adminPage('trust.read', <TrustAppeals />)} />
            <Route path='/dashboard/admin/legal-holds' element={adminPage('legal_holds.read', <LegalHolds />)} />
            <Route path='/dashboard/admin/staff-access-changes' element={adminPage('staff.access.manage', <StaffAccessChanges />)} />
            <Route path='/dashboard/admin/notification-deliveries' element={adminPage('notification_delivery.read', <NotificationDeliveryReconciliation />, true)} />
            <Route path='/dashboard/admin/message-moderation' element={adminPage('moderation.manage', <MessageModeration />)} />
            <Route path="/admin/proxy-inspectors" element={adminPage(['network.read', 'search.proxy_inspector.read'], <AdminInspectorList />)} />
            {/* The detail response contains private KYC identity data. A network
                listing capability alone must not reveal the protected detail. */}
            <Route path="/admin/proxy-inspectors/:profileId" element={adminPage('verification.read', <AdminInspectorDetailPage />)} />
            <Route path="/admin/proxy-inspections" element={adminPage('network.read', <AdminProxyInspections />)} />
            <Route path="/admin/proxy-inspections/:requestId" element={adminPage('network.read', <AdminProxyWorkspace />)} />
            <Route path="/dashboard/admin/proxy-inspectors" element={adminPage(['network.read', 'search.proxy_inspector.read'], <Navigate to="/admin/proxy-inspectors" replace />)} />
            <Route path="/dashboard/admin/proxy-inspections" element={adminPage('network.read', <Navigate to="/admin/proxy-inspections" replace />)} />
            <Route path="/dashboard/admin" element={adminPage('dashboard.read', <AdminDashboard />, true)} />
            <Route path="/dashboard/admin/installments" element={adminPage('search.installment.read', <Installments />)} />
            <Route path="/dashboard/admin/installments/:id" element={adminPage('search.installment.read', <Installments />)} />
            <Route path="/dashboard/admin/notifications/digest" element={adminPage('marketing.manage', <NotificationDigest />)} />
            <Route path="/dashboard/admin/manage-users" element={adminPage('accounts.read', <ManageUsers />)} />
            <Route path="/dashboard/admin/users/:id" element={adminPage('accounts.read', <UserDetails />)} />
            <Route path="/dashboard/admin/property-approvals" element={adminPage('listings.manage', <PropertyApprovalReview />)} />
            <Route path="/dashboard/admin/manage-properties" element={adminPage('listings.read', <ManageProperties />)} />
            <Route path="/dashboard/admin/projects" element={adminPage('projects.read', <AdminProjects />)} />
            <Route path="/dashboard/admin/projects/:id" element={adminPage('projects.read', <AdminProjectDetails />)} />
            <Route path="/dashboard/admin/property-imports" element={adminPage('imports.read', <AdminPropertyImports />)} />
            <Route path="/dashboard/admin/property-imports/:importId" element={adminPage('imports.read', <AdminPropertyImports />)} />
            <Route path="/dashboard/admin/property-details" element={adminPage('listings.read', <AdminPropertyDetails />)} />
            <Route path="/dashboard/admin/property-details/:id" element={adminPage('listings.read', <AdminPropertyDetails />)} />
            <Route path="/dashboard/admin/manage-payments" element={adminPage('finance.read', <ManagePayments />)} />
            <Route path="/dashboard/admin/payment-details/:id" element={adminPage('finance.read', <AdminPaymentDetails />)} />
            <Route path="/dashboard/admin/cart-checkouts" element={adminPage('finance.read', <AdminCartCheckouts />)} />
            <Route path="/dashboard/admin/cart-checkouts/:checkoutId" element={adminPage('finance.read', <AdminCartCheckoutDetail />)} />
            <Route path="/dashboard/admin/manage-inquiries" element={adminPage('support.read', <ManageInquiries />)} />
            <Route path="/dashboard/admin/inquiry-details/:id" element={adminPage('support.read', <AdminInquiryDetails />)} />
            <Route path="/dashboard/admin/manage-owners" element={adminPage('accounts.read', <ManageLandlords />)} />
            <Route path='/dashboard/admin/manage-landlords' element={adminPage('accounts.read', <ManageLandlords />)} />
            <Route path="/dashboard/admin/landlord-details" element={adminPage('accounts.read', <LandlordDetails />)} />
            <Route path="/dashboard/admin/owners/:id" element={adminPage('accounts.read', <LandlordDetails />)} />
            <Route path='/dashboard/admin/landlord-details/:id' element={adminPage('accounts.read', <LandlordDetails />)} />
            <Route path="/dashboard/admin/kyc" element={adminPage('verification.read', <KycManagement />)} />
            <Route path="/dashboard/admin/data-protection-execution" element={adminPage('privacy.read', <AdminDataProtectionExecution />)} />
            <Route path="/dashboard/admin/title-verifications" element={adminPage('title_verification.read', <TitleVerificationReview />)} />
            <Route path="/admin/kyc" element={adminPage('verification.read', <KycManagement />)} />
            <Route path="/dashboard/admin/featured" element={adminPage('marketing.manage', <FeaturedListings />)} />
            <Route path="/dashboard/admin/roi-assumptions" element={adminPage('roi.manage', <ROIAssumptions />)} />
            <Route path="/dashboard/admin/settings" element={adminPage('dashboard.read', <AdminSettings />)} />
            <Route path="/dashboard/admin/policies" element={adminPage('policies.read', <AdminPolicies />, true)} />
            <Route path="/dashboard/admin/virtual-tours" element={adminPage(['search.virtual_tour.read', 'virtual_tours.manage'], <AdminVirtualTours />)} />
            <Route path="/dashboard/admin/virtual-tours/:propertyId" element={adminPage(['search.virtual_tour.read', 'virtual_tours.manage'], <AdminVirtualTourDetail />)} />
            <Route path="/dashboard/admin/wallet" element={adminPage('finance.read', <AdminWallet />)} />
            <Route path="/dashboard/admin/escrows" element={adminPage(['escrow.read', 'finance.read'], <EscrowList />)} />
            <Route path="/dashboard/admin/escrows/:id" element={adminPage(['escrow.read', 'finance.read'], <EscrowDetails />)} />
            <Route path="/dashboard/admin/escrow-disputes" element={adminPage('escrow.read', <AdminEscrowDisputes />)} />
            <Route path="/dashboard/admin/escrow-disputes/:disputeId" element={adminPage('escrow.read', <AdminEscrowDisputeDetails />)} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
