import { createContext, useContext } from "react";
import { useState } from "react";
import { socket } from "../../lib/socket";
import { Socket } from "socket.io-client";
import { useAuth } from "@clerk/clerk-react";
interface UserContextType {
  fetchUser: () => Promise<void>;
  userData: UserData | null;
  socket: Socket;
  acceptDialog: boolean;
  setAcceptDialog: React.Dispatch<React.SetStateAction<boolean>>;
  incomingFrom: string | null;
  setIncomingFrom: React.Dispatch<React.SetStateAction<string | null>>;
  pendingOffer: any;
  setPendingOffer: React.Dispatch<React.SetStateAction<any>>;
}
const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { getToken, isSignedIn } = useAuth();
  const [acceptDialog, setAcceptDialog] = useState(false);
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);
  const [pendingOffer, setPendingOffer] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const backendUrl = "https://eternalv2.onrender.com";
  console.log(backendUrl);
  const fetchUser = async () => {
    if (isSignedIn) {
      const token = await getToken();
      const res = await fetch(`${backendUrl}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`, // 👈 send token
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error: ${res.status} - ${text}`);
      }
      const data = await res.json();
      setUserData(data.user);
    }
  };

  return (
    <UserContext.Provider value={{ socket, fetchUser, userData, acceptDialog, setAcceptDialog, incomingFrom, setIncomingFrom, pendingOffer, setPendingOffer }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within EditorProvider");
  return ctx;
};
