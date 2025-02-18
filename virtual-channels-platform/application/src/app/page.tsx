import Player from "@/components/Player";
import { getChannelUrl } from "@/server/actions";

export default async function Home() {
  const channelUrl = await getChannelUrl();
  return (
    <div className="w-full h-full">
      {channelUrl ? (<Player src={channelUrl} autoplay />) : null }
    </div>
  );
}
