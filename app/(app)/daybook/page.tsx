import DayBook from "@/components/DayBook";
import { PageTitle } from "@/components/shared";

export default function DayBookPage() {
  return (
    <>
      <PageTitle
        title="Day book"
        subtitle="Revenue, expenses and balance for every working day"
      />
      <DayBook />
    </>
  );
}
