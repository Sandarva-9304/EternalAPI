import { useUser } from "./contexts/UserContext";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react"; // ✅ icon library
import { SignInButton } from "@clerk/clerk-react";

const AddTask = () => {
  const { userData, fetchUser } = useUser();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("trello") === "connected") {
      setLoggedIn(true);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loginTrello = () => {
    window.location.href = "http://127.0.0.1:3000/api/auth/trello";
  };

  return (
    <div className="flex h-full justify-center items-center">
      {loggedIn ? (
        <button className="bg-blue-600 hover:bg-blue-400 text-p6 font-bold py-2 px-4 rounded">
          Add Task
        </button>
      ) : (
        <div className="flex flex-col gap-6 items-center">
          {/* ✅ GitHub Login Button */}
          <SignInButton
            disabled={!!userData} // disabled when already logged in
            className={`relative flex items-center justify-center gap-2 bg-p5 hover:bg-neutral-800 text-p6 font-bold py-2 px-4 rounded w-52 cursor-pointer ${
              userData ? "opacity-80 cursor-not-allowed" : ""
            }`}
          >
            <div className="flex justify-around">
              Login with GitHub
              {userData && (
                <CheckCircle
                  size={18}
                  className="absolute right-3 text-green-500"
                />
              )}
            </div>
          </SignInButton>

          {/* ✅ Trello Login Button - only enabled when GitHub is logged in */}
          <button
            onClick={loginTrello}
            disabled={!userData}
            className={`bg-blue-600 hover:bg-blue-400 text-p6 font-bold py-2 px-4 rounded w-52 ${
              !userData ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Login to Trello
          </button>
        </div>
      )}
    </div>
  );
};

export default AddTask;
