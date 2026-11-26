import MonthlySummary from "@/components/MonthlySummary";
import { PageTitle } from "@/components/shared";

export default function MonthlyPage() {
  return (
    <>
      <PageTitle
        title="Monthly sheet"
        subtitle="Every category across the month, by week or by branch"
      />
      <MonthlySummary />
    </>
  );
}
