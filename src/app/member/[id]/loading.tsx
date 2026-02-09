export default function MemberLoading() {
  return (
    <div className="min-h-screen py-8 bg-gray-100" dir="rtl">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="h-6 w-32 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 bg-gradient-to-l from-blue-500 to-blue-600">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
              <div className="w-24 h-24 rounded-full bg-white/20 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-8 w-48 bg-white/20 rounded animate-pulse" />
                <div className="h-5 w-64 bg-white/20 rounded animate-pulse" />
                <div className="h-4 w-40 bg-white/20 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="h-8 w-16 bg-gray-200 rounded mx-auto mb-2 animate-pulse" />
                  <div className="h-4 w-12 bg-gray-200 rounded mx-auto animate-pulse" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
              <div className="grid md:grid-cols-2 gap-6">
                <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
                <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
