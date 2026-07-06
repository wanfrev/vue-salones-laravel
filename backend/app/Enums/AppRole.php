<?php

namespace App\Enums;

enum AppRole: string
{
    case Superadmin = 'superadmin';
    case Admin = 'admin';
    case Empleado = 'empleado';
}
