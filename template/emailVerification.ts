import { Request, Response } from "express";
const appUrl = process.env.APP_URL;
export const successHTML = `
<html>
<head>
  <title>OTP Verification Error</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
</head>
<body class="p-0 m-0">
<div class="w-screen h-screen bg-[#eee] relative">
    <div class="flex items-center justify-center w-full h-full">
        <div style="
        width: 100%; 
        height: 100%;
        background-color: #0ff72a36;
        padding:10px;
        display:flex;
        flex-direction: column;
        align-items:center;
        justify-content:center;
        gap:10px
          ">
          <img width="100" height="100" src="https://img.icons8.com/ios-filled/100/ok--v1.png" alt="ok--v1"/>
            <h1 class="text-3xl font-bold  text-center">OTP Verified Successfully</h1>
            <p class="text-black">OTP has been successfully verified. Your account is now verified.</p>
            <a style="
                width:200px;
                text-decoration:none;
                height:56px;
                background-color:#000;
                color:#fff;
                display:flex;
                align-items:center;
                justify-content:center;
                border-radius:15px
            " href="${appUrl}/auth/login">Login</a>
        </div>
    </div>
</div>
</body>
</html>

`;

export const errorHTML = `
  <html>
    <head>
      <title>OTP Verification Error</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
    </head>
    <body class="p-0 m-0">
    <div class="w-screen h-screen bg-[#eee] relative">
        <div class="flex items-center justify-center w-full h-full">
            <div style="
            width: 100%; 
            height: 100%;
            background-color: #f70f0f36;
            padding:10px;
            display:flex;
            flex-direction: column;
            align-items:center;
            justify-content:center;
            gap:10px
              ">
              <img width="100" height="100" src="https://img.icons8.com/badges/100/broken-link.png" alt="broken-link"/>
                <h1 class="text-3xl font-bold  text-center">Error</h1>
                <p class="text-black">The provided link is either already utilized or invalid, resulting in an error.</p>
            </div>
        </div>
    </div>
    </body>
  </html>
`;
