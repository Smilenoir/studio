// src/components/PlayerList.tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Player {
  nickname: string;
  id: string;
}

interface PlayerListProps {
  playersInSession: Player[];
}

const PlayerList: React.FC<PlayerListProps> = ({ playersInSession }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Players in Session</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {playersInSession.map((player) => (
          <div key={player.id} className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.nickname}`}
                alt={player.nickname}
              />
              <AvatarFallback>{player.nickname.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              {" "}
              <p className="font-medium leading-none">{player.nickname}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PlayerList;