import PublicLayout from '../../../components/layout/PublicLayout';
import ROICalculator from '../../../components/roi/ROICalculator';

const ROICalculatorPage = () => {
  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-8 py-10">
        <ROICalculator />
      </section>
    </PublicLayout>
  );
};

export default ROICalculatorPage;
