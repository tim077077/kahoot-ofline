import { App } from "@/components/App";
import { styleSamples } from "@/lib/samples";

export default function Home() {
  return <App samples={styleSamples()} />;
}
