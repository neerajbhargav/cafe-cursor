import { Wall } from "@/components/wall";
import { listCards, toPublic } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cards = await listCards();
  return <Wall initialCards={cards.map(toPublic)} />;
}
