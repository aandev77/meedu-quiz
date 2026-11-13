import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#ffffff',
  color: '#1f2937',
  customClass: {
    popup: 'rounded-xl shadow-lg',
  },
});

export default Toast;