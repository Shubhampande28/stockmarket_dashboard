import { Skeleton } from "@/components/states/DataStates";

export default function IposLoading() {
  return (
    <div className="mx-auto max-w-[1360px] px-5 py-6 lg:px-10">
      <Skeleton height={70} className="mb-5" />
      <div className="flex flex-wrap gap-5">
        <div className="min-w-0 space-y-3" style={{ flex: "1 1 520px" }}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
        <div className="min-w-0" style={{ flex: "1 1 440px" }}>
          <Skeleton height={420} />
        </div>
      </div>
    </div>
  );
}
