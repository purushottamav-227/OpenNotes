import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Splash.css";

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/home", { replace: true });
    }, 3500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="splash-page">
      <div className="splash-background-glow"></div>

      <section className="splash-content">
        <div className="splash-logo-wrapper">
          <img
            src="/logo.png"
            alt="OpenNotes logo"
            className="splash-logo"
          />
        </div>

        

        <p className="splash-slogan">
          Every semester, every subject,
          <br />
          right at your fingertips.
        </p>

        <div className="splash-loader">
          <span></span>
        </div>
      </section>
    </main>
  );
}

export default Splash;