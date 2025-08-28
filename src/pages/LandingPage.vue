<template>
  <div class="landing-page">
    <Navbar />

    <section class="hero d-flex align-items-center text-center text-white">
      <div class="hero-overlay"></div>
      <div class="container position-relative">
        <h1 class="display-4 fw-bold mb-3">Your Event, Digitally Presented</h1>
        <p class="lead mb-4">Peshkash lets you offer guests digital menus, exhibits, and stories via QR codes — simple, elegant, and memorable.</p>
        <a href="#pricing" class="btn btn-primary btn-lg">Get Started</a>
      </div>
      <div class="shapes">
        <span class="shape shape-1"></span>
        <span class="shape shape-2"></span>
        <span class="shape shape-3"></span>
      </div>
    </section>

    <section class="how-it-works py-5">
      <div class="container">
        <h2 class="text-center mb-4">How It Works</h2>
        <div class="row g-4 text-center">
          <div class="col-md-4">
            <i class="bi bi-qr-code fs-1 text-primary mb-3"></i>
            <h5>Scan the QR</h5>
            <p class="text-muted">Guests scan the code placed at your event.</p>
          </div>
          <div class="col-md-4">
            <i class="bi bi-journal-richtext fs-1 text-primary mb-3"></i>
            <h5>Explore the Menu/Content</h5>
            <p class="text-muted">They view menus, exhibits, or stories on their device.</p>
          </div>
          <div class="col-md-4">
            <i class="bi bi-emoji-smile fs-1 text-primary mb-3"></i>
            <h5>Enjoy the Experience</h5>
            <p class="text-muted">Create a memorable, contactless experience.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="features py-5 bg-light">
      <div class="container">
        <h2 class="text-center mb-4">Features</h2>
        <div class="row g-4">
          <div class="col-md-3">
            <div class="card h-100 text-center border-0 shadow-sm">
              <div class="card-body">
                <i class="bi bi-credit-card fs-1 text-primary mb-3"></i>
                <h5 class="card-title">One-time QR purchase</h5>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card h-100 text-center border-0 shadow-sm">
              <div class="card-body">
                <i class="bi bi-repeat fs-1 text-primary mb-3"></i>
                <h5 class="card-title">Reusable QRs for multiple events</h5>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card h-100 text-center border-0 shadow-sm">
              <div class="card-body">
                <i class="bi bi-clock fs-1 text-primary mb-3"></i>
                <h5 class="card-title">Event activation (6 hours for ₹800)</h5>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card h-100 text-center border-0 shadow-sm">
              <div class="card-body">
                <i class="bi bi-bar-chart fs-1 text-primary mb-3"></i>
                <h5 class="card-title">Analytics &amp; feedback</h5>
                <p class="card-text text-muted small">Collect likes &amp; dislikes on dishes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="pricing py-5">
      <div class="container">
        <h2 class="text-center mb-4">Pricing</h2>
        <div class="row justify-content-center">
          <div class="col-md-6 col-lg-4">
            <div class="card text-center border-0 shadow">
              <div class="card-body">
                <h5 class="card-title">Basic Plan</h5>
                <p class="display-5 fw-bold text-primary">₹800</p>
                <p class="text-muted">per event (6 hours)</p>
                <p class="text-muted">Extra Hours: Add-on available</p>
                <a href="#" class="btn btn-primary">Choose Plan</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="py-4 bg-dark text-white text-center">
      <div class="container">
        <ul class="list-inline mb-3">
          <li class="list-inline-item"><a href="#" class="text-white text-decoration-none">About Us</a></li>
          <li class="list-inline-item"><a href="#" class="text-white text-decoration-none">Contact</a></li>
        </ul>
        <div>
          <a href="#" class="text-white me-3"><i class="bi bi-facebook"></i></a>
          <a href="#" class="text-white me-3"><i class="bi bi-twitter"></i></a>
          <a href="#" class="text-white"><i class="bi bi-instagram"></i></a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import Navbar from '../components/Navbar.vue';
</script>

<style scoped>
.landing-page {
  overflow-x: hidden;
}

.hero {
  position: relative;
  min-height: 100vh;
  background-image: url('https://images.unsplash.com/photo-1529634898368-2714d7b6a2de?auto=format&fit=crop&w=1950&q=80');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(65, 105, 225, 0.5);
}

.shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.shape {
  position: absolute;
  display: block;
  width: 40px;
  height: 40px;
  background: rgba(255, 215, 0, 0.3);
  border-radius: 50%;
  animation: float 20s infinite linear;
  backdrop-filter: blur(2px);
}

.shape-1 {
  top: 10%;
  left: 15%;
}

.shape-2 {
  top: 70%;
  left: 25%;
  width: 60px;
  height: 60px;
  animation-delay: 5s;
}

.shape-3 {
  top: 40%;
  left: 80%;
  width: 80px;
  height: 80px;
  animation-delay: 10s;
}

@keyframes float {
  0% {
    transform: translateY(0) translateX(0);
  }
  50% {
    transform: translateY(-50px) translateX(20px);
  }
  100% {
    transform: translateY(0) translateX(0);
  }
}

footer a:hover {
  color: #ffd700;
}
</style>

