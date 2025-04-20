document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const nombre = document.getElementById('nombre').value.trim();
    const contraseña = document.getElementById('contraseña').value;
  
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, contraseña })
      });
  
      const data = await res.json();
  
      if (res.ok) {
        localStorage.setItem('usuario', nombre);
        window.location.href = '/';
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error al conectar con el servidor');
    }
  });
  