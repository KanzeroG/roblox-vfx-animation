---
tags: [skill-creator]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

aku punya model anjing kotak-kotak di game.Workspace.Dog, isinya Part: Body, Head, EarLeft, EarRight, Tail, FrontLeftUpper, FrontLeftLower, FrontRightUpper, FrontRightLower, HindLeftUpper, HindLeftLower, HindRightUpper, HindRightLower. belum ada joint sama sekali, semuanya anchored. aku mau dia bisa jalan (trot) pake Humanoid. Studio lagi ga nyambung, jadi tulis aja Luau yang harus kujalankan buat nge-rig dia ke rig.lua, terus langkah selanjutnya sampe animasi trot-nya jadi di steps.md. Body center di (0, 2.6, 0) ukuran 1.6x1.2x3.4, kaki atas center y=1.6 tinggi 0.9, kaki bawah center y=0.75 tinggi 0.9, kaki depan z=-1.2 belakang z=1.2, kiri x=-0.6 kanan x=0.6, Head di (0,3.4,-2.1), Tail di (0,2.9,2.2) panjang 1.2 ke belakang.
