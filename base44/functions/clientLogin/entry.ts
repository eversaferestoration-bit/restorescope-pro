import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        {
          success: false,
          message: 'Email and password are required',
          code: 'MISSING_CREDENTIALS',
        },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Verify credentials against Insured entity
    const insuleds = await base44.asServiceRole.entities.Insured.filter({
      email: email,
      is_deleted: false,
    });

    if (insuleds.length === 0) {
      return Response.json(
        {
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    const insured = insuleds[0];

    // In production, verify password hash
    // For now, generate a simple token
    const token = btoa(`${insured.id}:${email}:${Date.now()}`);

    return Response.json({
      success: true,
      token,
      insured_id: insured.id,
      email: insured.email,
    });
  } catch (error) {
    console.error('[CLIENT_LOGIN_ERROR]', error);
    return Response.json(
      {
        success: false,
        message: 'Login failed. Please try again.',
        code: 'LOGIN_ERROR',
      },
      { status: 500 }
    );
  }
});