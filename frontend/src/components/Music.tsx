// import { ScrollArea } from "@radix-ui/react-scroll-area";
// import { useEffect, useState } from "react";
// import { ChevronLeft, LogOut } from "lucide-react";

// const Music = () => {
//   const [accessToken, setAccessToken] = useState<string | null>(null);
//   const [user, setUser] = useState<SpotifyUser | null>(null);
//   const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
//   const [selectedPlaylist, setSelectedPlaylist] =
//     useState<SpotifyPlaylist | null>(null);
//   const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
//   const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
//   const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
//   const [isPlaying, setIsPlaying] = useState(false);

//   // Parse access_token from URL on /spotify/success redirect
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const token = params.get("access_token");
//     console.log(token);

//     if (token) {
//       localStorage.setItem("spotify_access_token", token);
//       setAccessToken(token);
//       // Clear URL params so it looks clean after login
//       window.history.replaceState({}, document.title, window.location.pathname);
//     } else {
//       const stored = localStorage.getItem("spotify_access_token");
//       if (stored) setAccessToken(stored);
//     }
//   }, []);

//   // Fetch user profile once we have a token
//   useEffect(() => {
//     if (!accessToken) return;

//     const fetchUser = async () => {
//       const res = await fetch("https://api.spotify.com/v1/me", {
//         headers: { Authorization: `Bearer ${accessToken}` },
//       });
//       const data = await res.json();
//       console.log(data);
//       if (data.error) {
//         console.error(data.error);
//         setAccessToken(null);
//         localStorage.removeItem("spotify_access_token");
//       } else {
//         console.log(data);
//         setUser(data);  
//       }
//     };

//     fetchUser();
//   }, [accessToken]);

//   // Fetch playlists once user is loaded
//   useEffect(() => {
//     if (!accessToken || !user) return;

//     const fetchPlaylists = async () => {
//       const res = await fetch("https://api.spotify.com/v1/me/playlists", {
//         headers: { Authorization: `Bearer ${accessToken}` },
//       });
//       const data = await res.json();
//       if (data.items) setPlaylists(data.items);
//     };

//     fetchPlaylists();
//   }, [accessToken, user]);
//   const fetchPlaylistTracks = async (playlist: SpotifyPlaylist) => {
//     if (!accessToken) return;

//     setSelectedPlaylist(playlist);

//     const res = await fetch(
//       `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
//       {
//         headers: { Authorization: `Bearer ${accessToken}` },
//       }
//     );
//     const data: SpotifyPlaylistTracksResponse = await res.json();
//     const trackList = data.items.map((item) => item.track);
//     setTracks(trackList);
//   };
//   const handleTrackClick = (track: SpotifyTrack) => {
//     if (!track.uri) {
//       console.log("No uri");
//       return;
//     }
//     console.log(track.uri)

//     if (currentTrack && currentTrack.id === track.id) {
//       if (audio) {
//         if (isPlaying) {
//           audio.pause();
//           setIsPlaying(false);
//         } else {
//           audio.play();
//           setIsPlaying(true);
//         }
//       }
//       return;
//     }
//   };

//   const login = () => {
//     window.location.href = "http://127.0.0.1:3000/api/spotify/login";
//   };

//   const logout = () => {
//     localStorage.removeItem("spotify_access_token");
//     setAccessToken(null);
//     setUser(null);
//     setPlaylists([]);
//     setSelectedPlaylist(null);
//     setTracks([]);
//   };

//   return (
//     <ScrollArea className="bg-primary-sidebar text-p6 h-full p-4 overflow-y-auto scrollbar">
//       {!accessToken ? (
//         <button onClick={login} className="bg-emerald-500 px-4 py-2 rounded">
//           Login with Spotify
//         </button>
//       ) : user ? (
//         selectedPlaylist ? (
//           //  Playlist Detail View
//           <div>
//             <div className="flex items-center gap-2 mb-4">
//               <button
//                 onClick={() => {
//                   setSelectedPlaylist(null);
//                   setTracks([]);
//                 }}
//                 className="p-1 rounded-full hover:bg-neutral-800 transition"
//               >
//                 <ChevronLeft className="size-5" />
//               </button>
//               <h2 className="text-lg font-semibold">Back to Playlists</h2>
//             </div>

//             <div className="flex items-start gap-3 mb-4">
//               {selectedPlaylist.images[0] && (
//                 <img
//                   src={selectedPlaylist.images[0].url}
//                   alt={selectedPlaylist.name}
//                   className="w-24 h-24 rounded"
//                 />
//               )}
//               <div>
//                 <h1 className="text-xl font-bold">{selectedPlaylist.name}</h1>
//                 <p className="text-sm text-neutral-400">
//                   {selectedPlaylist.owner.display_name}
//                 </p>
//                 <p className="text-sm text-neutral-400">
//                   {selectedPlaylist.tracks.total} tracks
//                 </p>
//               </div>
//             </div>

//             <div>
//               {tracks.length > 0 ? (
//                 <ul className="space-y-2">
//                   {tracks.map((track) => (
//                     <li
//                       key={track.id}
//                       onClick={() => handleTrackClick(track)}
//                       className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-neutral-800 ${
//                         currentTrack?.id === track.id && isPlaying
//                           ? "bg-neutral-700"
//                           : ""
//                       }`}
//                     >
//                       {track.album.images[0] && (
//                         <img
//                           src={track.album.images[0].url}
//                           alt={track.name}
//                           className="w-10 h-10 rounded"
//                         />
//                       )}
//                       <div className="truncate">
//                         <p className="font-medium truncate">{track.name}</p>
//                         <p className="text-sm text-neutral-400 truncate">
//                           {track.artists.map((a) => a.name).join(", ")}
//                         </p>
//                       </div>
//                       {currentTrack?.id === track.id && isPlaying && (
//                         <span className="ml-auto text-xs text-emerald-400">
//                           Playing
//                         </span>
//                       )}
//                     </li>
//                   ))}
//                 </ul>
//               ) : (
//                 <p>No tracks found.</p>
//               )}
//             </div>
//           </div>
//         ) : (
//           <div>
//             <div className="flex items-center justify-between mb-4">
//               <div className="flex items-center gap-3">
//                 <img
//                   src={user.images?.[0]?.url}
//                   alt="Profile"
//                   className="w-12 h-12 rounded-full"
//                 />
//                 <div>
//                   <p className="font-semibold">{user.display_name}</p>
//                   <p className="text-sm text-neutral-400">{user.email}</p>
//                 </div>
//               </div>
//               <button
//                 onClick={logout}
//                 className="bg-red-500 text-xs p-2 rounded-full"
//               >
//                 <LogOut className="size-5" />
//               </button>
//             </div>

//             <h2 className="text-xl font-semibold mb-2">Your Playlists</h2>
//             {playlists.length > 0 ? (
//               <ul className="space-y-2">
//                 {playlists.map((pl) => (
//                   <li
//                     key={pl.id}
//                     onClick={() => fetchPlaylistTracks(pl)}
//                     className="flex items-center gap-3 cursor-pointer hover:bg-neutral-200/30 p-2 rounded"
//                   >
//                     {pl.images[0] && (
//                       <img
//                         src={pl.images[0].url}
//                         alt={pl.name}
//                         className="w-12 h-12 rounded"
//                       />
//                     )}
//                     <span className="truncate">{pl.name}</span>
//                   </li>
//                 ))}
//               </ul>
//             ) : (
//               <p>No playlists found.</p>
//             )}
//           </div>
//         )
//       ) : (
//         <p>Loading...</p>
//       )}
//     </ScrollArea>
//   );
// };

// export default Music;
