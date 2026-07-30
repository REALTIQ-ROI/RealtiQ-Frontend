import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

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

import Dashboard from '../pages/dashboard/Dashboard';
import Tours from '../pages/dashboard/Tours';
import Installments from '../pages/dashboard/Installments';
import NotificationDigest from '../pages/dashboard/NotificationDigest';
import AdminDashboard from '../pages/dashboard/Admin/AdminDashboard';
import AdminPropertyDetails from '../pages/dashboard/Admin/AdminPropertyDetails';
import AdminInquiryDetails from '../pages/dashboard/Admin/AdminInquiryDetails';
import LandlordDetails from '../pages/dashboard/Admin/LandlordDetails';
import UserDetails from '../pages/dashboard/Admin/UserDetails';
import ManageInquiries from '../pages/dashboard/Admin/ManageInquiries';
import ManageLandlords from '../pages/dashboard/Admin/ManageLandlords';
import ManagePayments from '../pages/dashboard/Admin/ManagePayments';
import ManageProperties from '../pages/dashboard/Admin/ManageProperties';
import ManageUsers from '../pages/dashboard/Admin/ManageUsers';
import FeaturedListings from '../pages/dashboard/Admin/FeaturedListings';
import AdminPaymentDetails from '../pages/dashboard/Admin/AdminPaymentDetails';
import TitleVerificationReview from '../pages/dashboard/Admin/TitleVerificationReview';
import PropertyApprovalReview from '../pages/dashboard/Admin/PropertyApprovalReview';
import BuyerDashboard from '../pages/dashboard/Buyer/BuyerDashboard';
import InquiryDetails from '../pages/dashboard/Buyer/InquiryDetails';
import InquiryHistory from '../pages/dashboard/Buyer/InquiryHistory';
import MyProperties from '../pages/dashboard/Buyer/MyProperties';
import PaymentDetails from '../pages/dashboard/Buyer/PaymentDetails';
import PaymentHistory from '../pages/dashboard/Buyer/PaymentHistory';
import ProfileSettings from '../pages/dashboard/Buyer/ProfileSettings';
import BuyerPropertyDetails from '../pages/dashboard/Buyer/PropertyDetails';
import AddProperty from '../pages/dashboard/Landlord/AddProperty';
import Editproperty from '../pages/dashboard/Landlord/Editproperty';
import InquiriesList from '../pages/dashboard/Landlord/InquiriesList';
import LandlordDashboard from '../pages/dashboard/Landlord/LandlordDashboard';
import LandlordInquiryDetails from '../pages/dashboard/Landlord/LandlordInquiryDetails';
import LandlordMyProperties from '../pages/dashboard/Landlord/LandlordMyProperties';
import LandlordPaymentHistory from '../pages/dashboard/Landlord/LandlordPaymentHistory';
import LandlordPropertyDetails from '../pages/dashboard/Landlord/LandlordPropertyDetails';
import LandlordSettings from '../pages/dashboard/Landlord/LandlordSettings';
import LandlordVerification from '../pages/dashboard/Landlord/LandlordVerification';
import LandlordTitleVerifications from '../pages/dashboard/Landlord/LandlordTitleVerifications';
import ProtectedRoute from './ProtectedRoute';
import ROICalculatorPage from '../pages/dashboard/ROI/ROICalculatorPage';
import PropertyROICalculatorPage from '../pages/dashboard/ROI/PropertyROICalculatorPage';
import MyROIScenarios from '../pages/dashboard/ROI/MyROIScenarios';
import ROIAssumptions from '../pages/dashboard/Admin/ROIAssumptions';
import AdminSettings from '../pages/dashboard/Admin/AdminSettings';
import AdminWallet from '../pages/dashboard/Admin/AdminWallet';
import AdminEscrowDisputes from '../pages/dashboard/Admin/AdminEscrowDisputes';
import AdminEscrowDisputeDetails from '../pages/dashboard/Admin/AdminEscrowDisputeDetails';
import KycManagement from '../pages/dashboard/Admin/KycManagement';
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
import PropertyMarketAnalytics from '../pages/analytics/PropertyMarketAnalytics';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/properties" element={<Listings />} />
        <Route path="/proxy-inspectors" element={<PublicInspectorDirectory />} />
        <Route path="/proxy-inspectors/register" element={<InspectorRegistration />} />
        <Route path="/proxy-inspectors/:profileId" element={<PublicInspectorProfile />} />

        <Route path="/about-contact" element={<AboutAndContact />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/checkout" element={<Checkout />} />
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
        <Route path="/auth/landlord/login" element={<LandlordLogin />} />
        <Route path="/auth/landlord/register" element={<LandlordRegistration />} />

        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/properties/:id/price-history" element={<PropertyPriceHistory />} />
        <Route path="/title-verification/:publicVerificationId" element={<TitleVerificationRegistry />} />
        <Route path="/title-registry/snapshots" element={<TitleRegistrySnapshots />} />
        <Route path="/protected-title-viewer" element={<ProtectedTitleViewer />} />
        <Route path="/properties/:propertyId/roi" element={<PropertyROICalculatorPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics/property-market" element={<PropertyMarketAnalytics />} />
          <Route path="/analytics/property-market/access" element={<PropertyMarketAnalytics />} />
          <Route path="/analytics/property-market/payment-return" element={<ProxyPaymentReturn />} />
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
          <Route path="/proxy/tasks" element={<InspectorTasks />} />
          <Route path="/proxy/tasks/:requestId" element={<InspectorProxyWorkspace />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['landlord']} />}>
          <Route path="/dashboard/landlord" element={<LandlordDashboard />} />
          <Route path="/dashboard/landlord/my-properties" element={<LandlordMyProperties />} />
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
          <Route path="/admin/proxy-inspectors" element={<AdminInspectorList />} />
          <Route path="/admin/proxy-inspectors/:profileId" element={<AdminInspectorDetailPage />} />
          <Route path="/admin/proxy-inspections" element={<AdminProxyInspections />} />
          <Route path="/admin/proxy-inspections/:requestId" element={<AdminProxyWorkspace />} />
          <Route path="/dashboard/admin/proxy-inspectors" element={<Navigate to="/admin/proxy-inspectors" replace />} />
          <Route path="/dashboard/admin/proxy-inspections" element={<Navigate to="/admin/proxy-inspections" replace />} />
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/dashboard/admin/tours" element={<Tours />} />
          <Route path="/dashboard/admin/installments" element={<Installments />} />
          <Route path="/dashboard/admin/installments/:id" element={<Installments />} />
          <Route path="/dashboard/admin/notifications/digest" element={<NotificationDigest />} />
          <Route path="/dashboard/admin/manage-users" element={<ManageUsers />} />
          <Route path="/dashboard/admin/users/:id" element={<UserDetails />} />
          <Route path="/dashboard/admin/property-approvals" element={<PropertyApprovalReview />} />
          <Route path="/dashboard/admin/manage-properties" element={<ManageProperties />} />
          <Route path="/dashboard/admin/property-details" element={<AdminPropertyDetails />} />
          <Route path="/dashboard/admin/property-details/:id" element={<AdminPropertyDetails />} />
          <Route path="/dashboard/admin/manage-payments" element={<ManagePayments />} />
          <Route path="/dashboard/admin/payment-details/:id" element={<AdminPaymentDetails />} />
          <Route path="/dashboard/admin/manage-inquiries" element={<ManageInquiries />} />
          <Route path="/dashboard/admin/inquiry-details/:id" element={<AdminInquiryDetails />} />
          <Route path="/dashboard/admin/manage-landlords" element={<ManageLandlords />} />
          <Route path="/dashboard/admin/landlord-details" element={<LandlordDetails />} />
          <Route path="/dashboard/admin/landlord-details/:id" element={<LandlordDetails />} />
          <Route path="/dashboard/admin/kyc" element={<KycManagement />} />
          <Route path="/dashboard/admin/title-verifications" element={<TitleVerificationReview />} />
          <Route path="/admin/kyc" element={<KycManagement />} />
          <Route path="/dashboard/admin/featured" element={<FeaturedListings />} />
          <Route path="/dashboard/admin/roi-assumptions" element={<ROIAssumptions />} />
          <Route path="/dashboard/admin/settings" element={<AdminSettings />} />
          <Route path="/dashboard/admin/wallet" element={<AdminWallet />} />
          <Route path="/dashboard/admin/escrows" element={<EscrowList />} />
          <Route path="/dashboard/admin/escrows/:id" element={<EscrowDetails />} />
          <Route path="/dashboard/admin/escrow-disputes" element={<AdminEscrowDisputes />} />
          <Route path="/dashboard/admin/escrow-disputes/:disputeId" element={<AdminEscrowDisputeDetails />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
