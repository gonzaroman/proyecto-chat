const socket = io();

document.getElementById('chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const messageInput = document.getElementById('message-input');
  const message = messageInput.value;
  if (message.trim() !== '') {
    socket.emit('chat message', message);
    messageInput.value = '';
  }
});

socket.on('chat message', (message) => {
  const messagesList = document.getElementById('messages');
  const li = document.createElement('li');
  li.textContent = message;
  messagesList.appendChild(li);
});
