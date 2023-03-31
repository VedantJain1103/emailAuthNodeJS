const express = require('express');
require('dotenv').config()

const router = express.Router();

const jwt = require('jsonwebtoken');

const accountsServices = require('../services/accountsServices');
const { encrypt, decrypt } = require('../services/encryptionServices');

router.get('/signIn', (req, res) => {
    res.render('accounts/signIn', { title: 'Express', email: '' });
});

router.get('/register', (req, res) => {
    res.render('accounts/register');
});

router.get('/verification', (req, res) => {
    res.render('accounts/verification');
});

router.post('/register', async (req, res) => {
    const { fullName, email, phone, password, confirmPassword } = req.body;
    if (password == null || (password != confirmPassword)) res.render('accounts/register', { error: "Passwords do not match" });
    else {
        let strongPasswordReq = new RegExp('(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})');
        // atleast one lower case char
        // atleast one upper case char
        // atleast one digit
        // atleast one special char
        // atleast of length 8
        if (strongPasswordReq.test(password)) {
            accountsServices.createUser(fullName, email, phone, password, function (error) {
                if (error) {
                    res.render('accounts/register', { error: error, fullName, email, phone });
                } else {
                        accountsServices.sendEmailVerification(email, function (error2) {
                            if (error2) {
                                res.send(error2);
                            } else {
                                res.redirect(`/accounts/${email}/verification`);
                            }
                        });
                    }
            });
        } else {
            res.render('accounts/register', { error: 'Enter a valid Password', fullName, email, phone });
        }
    }
});


router.post('/verification', async (req, res) => {
    const { email, code } = req.body;
    try {
        await accountsServices.checkVerification(email, code, function (error, status) {
            if (error) {
                console.log(error);
                accountsServices.sendEmailVerification(email, function (error2) {
                    if (error2) {
                        res.render('accounts/verification', { error:error2, email });
                    } else {
                        res.render('accounts/verification', { error:error+'. Please enter the new code sent to your email.', email:email });
                    }
                });
            } else if (status) {
                const ciphertextEmail = encrypt(email);;
                res.redirect(`/accounts/signIn`);
            }
        })
    } catch (error) {
        console.log(error);
        res.render('accounts/verfication', { error, email });
    }
});

router.post('/signIn', async (req, res) => {
    const { email, password } = req.body;
    accountsServices.signIn(email, password, function (error, foundUser, refreshToken,accessToken) {
        if (error) {
            const msg = "Invalid Username or Password";
            res.render('accounts/signIn', { error: msg, email: email });
        }
        if (foundUser.isEmailVerified) {
            console.log("data",foundUser, refreshToken);
            res.cookie('jwt', refreshToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
            // res.header('Authorization', 'Authorization ' + accessToken);
            // req.header('authorization','Authorization ' + accessToken)
            // console.log(res);
            // console.log(res.headersSent);
            // req.userId = foundUser._id;
            res.redirect(`/users/${accessToken}`);
        }
        else {
            accountsServices.sendEmailVerification(email, function (error) {
                if (error) {
                    res.render('accounts/signIn', { error, email });
                } else {
                    res.redirect(`/accounts/verification`);
                }
            });
        }
    });
});


module.exports = router;