import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Instant Game Keys
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Get your favorite games instantly. Steam, PlayStation, Xbox & more.
            Best prices, instant delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Link href="/store" className="btn-primary text-lg py-4 px-8">
              🎮 Browse Store
            </Link>
            <Link href="/register" className="btn-secondary text-lg py-4 px-8">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose <span className="text-purple-400">CDKeys</span>?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Instant Delivery',
                description: 'Get your game key immediately after purchase. No waiting, start playing right away.',
              },
              {
                icon: '🔒',
                title: 'Secure & Verified',
                description: 'All keys are verified and guaranteed to work. 100% authentic codes.',
              },
              {
                icon: '💰',
                title: 'Best Prices',
                description: 'We offer competitive prices on all major platforms. Save money on every purchase.',
              },
            ].map((feature, i) => (
              <div key={i} className="glass-card p-8 text-center animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-10">
            Supported Platforms
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { name: 'Steam', color: '#1b2838' },
              { name: 'PlayStation', color: '#003087' },
              { name: 'Xbox', color: '#107c10' },
              { name: 'Nintendo', color: '#e60012' },
              { name: 'Epic Games', color: '#2a2a2a' },
              { name: 'Origin', color: '#f56c2d' },
            ].map((platform) => (
              <div
                key={platform.name}
                className="glass-card px-8 py-4 flex items-center gap-3"
                style={{ borderColor: platform.color + '40' }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                <span className="font-medium text-gray-300">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto glass-card p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Gaming?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Join thousands of gamers who trust us for their game keys.
          </p>
          <Link href="/store" className="btn-primary text-lg py-4 px-10">
            Explore Games →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-gray-800 text-center text-gray-500">
        <p>© 2024 CDKeys Marketplace. All rights reserved.</p>
        <p className="mt-2 text-sm">Demo project - No real transactions</p>
      </footer>
    </div>
  );
}
