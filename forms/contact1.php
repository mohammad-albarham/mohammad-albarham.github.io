<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
  $to = "mohammad.albarham.work@gmail.com"; // Replace with the recipient's email address
  $subject = $_POST["subject"];
  $name = $_POST["name"];
  $email = $_POST["email"];
  $message = $_POST["message"];

  echo $subject;
  echo $name;
  echo $email;
  echo $message
  // Email headers
  $headers = "From: $name <$email>" . "\r\n";
  $headers .= "Reply-To: $email" . "\r\n";
  $headers .= "Content-Type: text/plain; charset=utf-8" . "\r\n";

  // Sending the email
  if (mail($to, $subject, $message, $headers)) {
    echo "Email sent successfully!";
  } else {
    echo "Failed to send the email. Please try again later.";
  }
}
?>
