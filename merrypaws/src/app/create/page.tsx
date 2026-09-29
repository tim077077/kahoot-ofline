import { Create } from "@/components/Create";
import { styleSamples } from "@/lib/samples";

export default function CreatePage() {
  return <Create samples={styleSamples()} />;
}
