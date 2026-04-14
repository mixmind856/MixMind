import Sidebar from "../components/Sidebar";
import QrCard from "../components/QrCard";
import RequestList from "../components/RequestList";
import PopularSongs from "../components/PopularSongs";

export default function Dashboard() {
  return (
    <div className="min-h-screen  text-white flex">
      
      {/* Sidebar: hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 sm:p-6 lg:p-10">
        
        {/* Header */}
        <div className="mb-8 text-center lg:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome Back,{" "}
            <span className="text-purple-400">Club Infinity!</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Approve or decline song requests in real time.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Requests */}
          <div className="lg:col-span-8">
            <RequestList />
          </div>

          {/* Right panel */}
          <div className="lg:col-span-4 space-y-6">
            <QrCard />
            <PopularSongs />
          </div>
        </div>
      </main>
    </div>
  );
}
