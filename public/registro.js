document.getElementById('form-registro').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const nombre = document.getElementById('nombre').value.trim();
    const contraseña = document.getElementById('contraseña').value;
    const repetir = document.getElementById('repetir').value;
  
    if (contraseña !== repetir) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }
  
    try {
      const res = await fetch('/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, contraseña })
      });
  
      const data = await res.json();
  
      if (res.ok) {
        alert('✅ Usuario registrado correctamente');
        localStorage.setItem('usuario', nombre);
        window.location.href = '/';
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      alert('❌ Error en el servidor');
      console.error(err);
    }
  });
  